<?xml version="1.0"?>
<xsl:stylesheet version="1.0"
xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
 <xsl:strip-space elements="*" />
    <xsl:template match="/">
        <xsl:for-each select="prov">
            <div class="prov">
                <xsl:attribute name="id">
                    <xsl:value-of select="@id"/>
                </xsl:attribute>
                <h5 class="prov labelled">
                    <span class="label">
                        <xsl:value-of select="label"/>
                    </span>
                    <span class="spc"></span>
                    <xsl:value-of select="heading"/>
                </h5>
                <ul class="prov">
                    <xsl:for-each select="prov.body/subprov">
                        <li>
                            <div class="subprov">
                                <p class="class">
                                    <xsl:value-of select="para/text"/>
                                </p>

                                <xsl:for-each select="para/label-para">
                                    <ul class="label-para">
                                        <li>
                                            <p class="labelled label">
                                                <span class="label">
                                                    (<xsl:value-of select="label"/>)
                                                </span>
                                                <span class="spc">&#160;</span>
                                                <xsl:value-of select="para/text"/>
                                            </p>
                                        </li>
                                    </ul>
                                </xsl:for-each>
                            </div>
                    <xsl:for-each select='../../notes/history/history-note'>
                        <p class="history-note">
                            <xsl:attribute name="id">
                                <xsl:value-of select="@id"/>
                            </xsl:attribute>
                            <xsl:value-of select="."/>
                        </p>
                    </xsl:for-each>
                        </li>
                    </xsl:for-each>
                </ul>
            </div>
        </xsl:for-each>
    </xsl:template>
</xsl:stylesheet>