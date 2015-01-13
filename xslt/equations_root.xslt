<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:import href="equations.xslt"/>
    <xsl:import href="transform.xslt"/>

    <xsl:template match="/">
        <xsl:apply-templates select="eqn"/>
    </xsl:template>

</xsl:stylesheet>
